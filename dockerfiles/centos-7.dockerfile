ARG VCPKG_REF=latest
FROM hpccsystems/platform-build-base-centos-7:$VCPKG_REF

RUN yum install -y flex bison rpm-build && \
    yum -y clean all && rm -rf /var/cache 

ENTRYPOINT ["/bin/bash", "--login", "-c"]

RUN yum install -y \
    rpm-build && \
    yum -y clean all && rm -rf /var/cache 

CMD ["/bin/bash"]
